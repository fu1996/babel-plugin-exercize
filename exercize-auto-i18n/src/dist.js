const resource = {
  "111我是取参数的{arg0} {arg1}": "111我是取参数的{arg0} {arg1}",
  "嵌套的模板语言{arg0}": "嵌套的模板语言{arg0}",
  "222我是取参数的{arg0} {arg1} {arg2}": "222我是取参数的{arg0} {arg1} {arg2}",
  "我是最后一层{arg0}": "我是最后一层{arg0}",
  "3333{arg0} {arg1}": "3333{arg0} {arg1}",
  "333我是取参数的{arg0} {arg1} {arg2}": "333我是取参数的{arg0} {arg1} {arg2}"
};

const t = function(key, obj) {
  let template = resource[key];
  Object.keys(obj).forEach(key => {
   const resplaceKey = `{${key}}`;
   template = template.replace(resplaceKey, obj[key]);
  })
  return template;
}

const params = 1;
const a = 2;
const res = t('111我是取参数的{arg0} {arg1}', {
  arg0: params + a,
  arg1: a
});
console.log(res);
const res2 = t('222我是取参数的{arg0} {arg1} {arg2}', {
  arg0: params + a,
  arg1: a,
  arg2: t('嵌套的模板语言{arg0}', {
    arg0: a
  })
});
console.log(res2);
const res3 = t('333我是取参数的{arg0} {arg1} {arg2}', {
  arg0: params + a,
  arg1: a,
  arg2: t('嵌套的模板语言{arg0}', {
    arg0: t('3333{arg0} {arg1}', {
      arg0: a,
      arg1: t('我是最后一层{arg0}', {
        arg0: a
      })
    })
  })
});
console.log(res3);