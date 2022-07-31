const { declare } = require("@babel/helper-plugin-utils");
const fse = require("fs-extra");
const path = require("path");
const generate = require("@babel/generator").default;

/** unicode cjk 中日韩文 范围 */
const DOUBLE_BYTE_REGEX = /[\u4E00-\u9FFF]/g;

let intlIndex = 0;
function nextIntlKey() {
    ++intlIndex;
    return `intl${intlIndex}`;
}
// 根据参数生成 字符串
function generateParams(kvObj = {}) {
    console.log("generating params", kvObj);
    let str = "{";
    Object.keys(kvObj).forEach((key) => {
        const code = `${key}: ${kvObj[key]},`;
        str += code;
    });
    str += "}";
    return str;
}

// 将生成的国际化数据进行保留
function save(file, key, value) {
    const allText = file.get("allText");
    allText.push({
        key,
        value,
    });
    file.set("allText", allText);
}
// 递归解析 TemplateLiteral 类型的数据
function parseTemplate(path, state) {
    const expressions = path.expressions;
    // 将 path 变为字符串 并去除 头尾的 ` 符号
    let pathStringCode = generate(path).code
    pathStringCode = pathStringCode.substring(1, pathStringCode.length - 1);
    // 非中文的可以不用解析
    if (!pathStringCode.match(DOUBLE_BYTE_REGEX)) {
        return;
    }
    const kvObj = {};
    for (let i = 0; i < expressions.length; i++) {
        const childElement = expressions[i];
        if (childElement.type === 'TemplateLiteral') {
            console.log("用递归解决嵌套 模板字符串");
            const newCodeAst = generate(childElement);
            const realCode = newCodeAst.code;
            const targetSource = parseTemplate(childElement, state);
            const templateRealCode = "${" + realCode + "}";
            const value = `{arg${i}}`;
            kvObj[`arg${i}`] = targetSource;
            pathStringCode = pathStringCode.replace(templateRealCode, value);
        } else {
            const realCode = generate(expressions[i]).code;
            const templateRealCode = "${" + realCode + "}";
            const value = `{arg${i}}`;
            console.log("realCode", realCode);
            kvObj[`arg${i}`] = realCode;
            pathStringCode = pathStringCode.replace(templateRealCode, value);
        }
    }
    // 使用 t 函数进行包裹
    const targetSource = `t('${pathStringCode}'${Object.keys(kvObj).length > 0 ? `, ${generateParams(kvObj)}` : null
        })`;
    save(state.file, pathStringCode, pathStringCode)
    // path.replaceWithSourceString(targetSource);
    return targetSource;
}

const autoTrackPlugin = declare((api, options, dirname) => {
    api.assertVersion(7);

    if (!options.outputDir) {
        throw new Error("outputDir in empty");
    }

    function getReplaceExpression(path, value, intlUid) {
        const expressionParams = path.isTemplateLiteral()
            ? path.node.expressions.map((item) => generate(item).code)
            : null;
        let replaceExpression = api.template.ast(
            `${intlUid}.t('${value}'${expressionParams ? "," + expressionParams.join(",") : ""
            })`
        ).expression;
        if (
            path.findParent((p) => p.isJSXAttribute()) &&
            !path.findParent((p) => p.isJSXExpressionContainer())
        ) {
            replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
        }
        return replaceExpression;
    }
    


    return {
        pre(file) {
            file.set("allText", []);
        },
        visitor: {
            Program: {
                enter(path, state) {
                    let imported;
                    path.traverse({
                        ImportDeclaration(p) {
                            const source = p.node.source.value;
                            if (source === "intl") {
                                imported = true;
                            }
                        },
                    });
                    if (!imported) {
                        const uid = path.scope.generateUid("intl");
                        const importAst = api.template.ast(`import ${uid} from 'intl'`);
                        path.node.body.unshift(importAst);
                        state.intlUid = uid;
                    }

                    path.traverse({
                        "StringLiteral|TemplateLiteral"(path) {
                            if (path.node.leadingComments) {
                                path.node.leadingComments = path.node.leadingComments.filter(
                                    (comment, index) => {
                                        if (comment.value.includes("i18n-disable")) {
                                            path.node.skipTransform = true;
                                            return false;
                                        }
                                        return true;
                                    }
                                );
                            }
                            if (path.findParent((p) => p.isImportDeclaration())) {
                                path.node.skipTransform = true;
                            }
                        },
                    });
                },
            },
            StringLiteral(path, state) {
                if (path.node.skipTransform) {
                    return;
                }
                let key = nextIntlKey();
                save(state.file, key, path.node.value);
                const replaceExpression = getReplaceExpression(
                    path,
                    key,
                    state.intlUid
                );
                const realCode = generate(replaceExpression).code;
                path.replaceWith(replaceExpression);
                path.skip();
            },
            TemplateLiteral(path, state) {
                if (path.node.skipTransform) {
                    return;
                }
                const expressions = path.node.expressions;
                // 将 path 变为字符串 并去除 头尾的 ` 符号
                let pathStringCode = path
                    .toString()
                    .substring(1, path.toString().length - 1);
                // 判断是不是中文
                if (!pathStringCode.match(DOUBLE_BYTE_REGEX)) {
                    return;
                }
                const kvObj = {};
                for (let i = 0; i < expressions.length; i++) {
                    const childElement = expressions[i];
                    if (childElement.type === 'TemplateLiteral') {
                        console.log("用递归解决嵌套 模板字符串");
                        const newCodeAst = generate(childElement);
                        const realCode = newCodeAst.code;
                        const targetSource = parseTemplate(childElement, state);
                        const templateRealCode = "${" + realCode + "}";
                        const value = `{arg${i}}`;
                        kvObj[`arg${i}`] = targetSource;
                        pathStringCode = pathStringCode.replace(templateRealCode, value);
                    } else {
                        const realCode = generate(expressions[i]).code;
                        const templateRealCode = "${" + realCode + "}";
                        const value = `{arg${i}}`;
                        console.log("realCode", realCode);
                        kvObj[`arg${i}`] = realCode;
                        pathStringCode = pathStringCode.replace(templateRealCode, value);
                    }
                }
                // 使用 t 函数进行包裹
                const targetSource = `t('${pathStringCode}'${Object.keys(kvObj).length > 0 ? `, ${generateParams(kvObj)}` : null
                    })`;
                save(state.file, pathStringCode, pathStringCode);
                path.replaceWithSourceString(targetSource);
                path.skip();
                // const value = path.get('quasis').map((item) => {
                //     const v = item.node.value.raw;
                //     if (v.length === 0) {
                //         return `arg${argIndex++}`;
                //     }
                //     return v;
                // }).join('');
                // if(value) {
                //     let key = nextIntlKey();
                //     save(state.file, key, value);

                //     const replaceExpression = getReplaceExpression(path, key, state.intlUid);
                //     const realCode = generate(replaceExpression).code;
                //     path.replaceWith(replaceExpression);
                //     path.skip();
                // }
                // path.get('quasis').forEach(templateElementPath => {
                //     const value = templateElementPath.node.value.raw;
                //     if(value) {
                //         let key = nextIntlKey();
                //         save(state.file, key, value);

                //         const replaceExpression = getReplaceExpression(templateElementPath, key, state.intlUid);
                //         templateElementPath.replaceWith(replaceExpression);
                //     }
                // });
                // path.skip();
            },
        },
        post(file) {
            const allText = file.get("allText");
            const intlData = allText.reduce((obj, item) => {
                obj[item.key] = item.value;
                return obj;
            }, {});

            const content = `const resource = ${JSON.stringify(
                intlData,
                null,
                4
            )};\nexport default resource;`;
            fse.ensureDirSync(options.outputDir);
            fse.writeFileSync(path.join(options.outputDir, "zh_CN.js"), content);
            fse.writeFileSync(path.join(options.outputDir, "en_US.js"), content);
        },
    };
});
module.exports = autoTrackPlugin;
