/**
 * 调用 seed-demo 接口生成示例数据
 * 用法：node scripts/seed-demo.js
 * 需先启动后端：npm run dev
 */
const http = require('http')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/dev/seed-demo',
  method: 'POST',
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => (data += chunk))
  res.on('end', () => {
    try {
      const json = JSON.parse(data)
      if (res.statusCode >= 400 || json.error) {
        console.error('❌ 生成示例数据失败')
        console.error('原因:', json.error || json.message)
        process.exit(1)
      }
      console.log('✅', json.message)
      if (json.students) {
        console.log('学生:', json.students.length, '人')
        const list = json.students.map((s) => `${s.studentId} ${s.name}`)
        for (let i = 0; i < list.length; i += 5) {
          console.log(' ', list.slice(i, i + 5).join(' | '))
        }
      }
      if (json.staff) console.log('教职工:', `${json.staff.name}(${json.staff.staffId})`)
      if (json.stats) console.log('数据:', `成绩 ${json.stats.grades} 条, 出勤 ${json.stats.attendances} 条, 预警 ${json.stats.warnings} 条`)
    } catch {
      console.log(data)
    }
  })
})

req.on('error', (e) => {
  console.error('❌ 请求失败，请确保后端已启动 (npm run dev):', e.message)
  process.exit(1)
})

req.end()
