function getWeightedAverageCoordinates(t, curveMap) {
    console.log(curveMap);
    const newObject = {};
for (const key in curveMap) {
  newObject[Number(key)] = curveMap[key];
}
curveMap = newObject;
console.log(curveMap);
  const times = Object.keys(curveMap).map(Number).sort((a, b) => a - b);
  // 查找 t 所在的两个时间点
  let t1 = null;
  let t2 = null;
  
  for (let i = 0; i < times.length - 1; i++) {
    if (t >= times[i] && t <= times[i+1]) {
      t1 = times[i];
      t2 = times[i+1];
      break;
    }
  }

  // 如果找不到合适的时间范围，返回 null
  if (t1 === null) {
    return null;
  }
  
  // 获取两个时间点对应的坐标
  const [x1, y1] = curveMap[t1];
  const [x2, y2] = curveMap[t2];
  
  // 计算加权因子
  const totalDuration = t2 - t1;
  // 如果 t1 === t2，则直接返回其中一个坐标
  if (totalDuration === 0) {
    return [x1, y1];
  }
  
  // 距离加权平均的逻辑
  // t 距离 t1 越近，t1 的权重越大
  // t 距离 t2 越近，t2 的权重越大
  const weight2 = (t - t1) / totalDuration;
  const weight1 = 1 - weight2;
  
  // 计算加权平均坐标
  const weightedX = weight1 * x1 + weight2 * x2;
  const weightedY = weight1 * y1 + weight2 * y2;
  
  return [weightedX, weightedY];
}

var curveMap = {"0":[89.8125,12.5],"0.50":[85.8125,19.5],"0.56":[188.8125,47.5],"0.60":[415.8125,118.5],"0.66":[469.8125,144.5],"0.71":[469.8125,144.5],"0.76":[469.8125,144.5]}
console.log(getWeightedAverageCoordinates(0, curveMap));