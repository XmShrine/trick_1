const stringify = (obj) => {
  return JSON.stringify(obj, (k, v) => {
    if(typeof v === 'function') {
        return `FUNCTION_FLAG ${v}`
    } else {
      return v
    }
  })
}
const parse = (jsonStr) => {
  return JSON.parse(jsonStr, (key, value) => {
    if(value && typeof value === 'string') {
        return value.indexOf('FUNC_JSON') > -1 ? new Function(`return ${value.replace('FUNC_JSON', '')}`)() : value
    }
    return value
  })
}