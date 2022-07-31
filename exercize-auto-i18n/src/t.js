const resource = {
    "111我是取参数的{arg0} {arg1}": "111我是取参数的{arg0} {arg1}",
    "222我是取参数的{arg0} {arg1} {arg2}": "222我是取参数的{arg0} {arg1} {arg2}",
    "intl1": "情况一：我是中文的",
    "intl2": "情况二：我是在jsx prop里的",
    "我是需要传参的{arg0}": "我是需要传参的{arg0}",
    "intl3": "你好啊",
    "我是取参数的{arg0} {arg1}": "我是取参数的{arg0} {arg1}"
  };
  
  const t = function(key, obj) {
    let template = resource[key];
    Object.keys(obj).forEach(key => {
     const resplaceKey = `{${key}}`;
     template = template.replace(resplaceKey, obj[key]);
    })
    return template;
  }