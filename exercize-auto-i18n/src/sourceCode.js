const params = 1;
const a = 2;
const res = `111我是取参数的${params + a} ${a}`;
console.log(res);
const res2 = `222我是取参数的${params + a} ${a} ${`嵌套的模板语言${a}`}`;
console.log(res2);

const res3 = `333我是取参数的${params + a} ${a} ${`嵌套的模板语言${`3333${a} ${`我是最后一层${a}`}`}`}`;
console.log(res3);