import { spawn } from 'child_process'

const roleArg = process.argv[2]
const role =
  roleArg === 'delivery' || roleArg === 'rider' ? 'delivery' : 'kitchen'

process.env.EXPO_PUBLIC_APP_ROLE = role

const child = spawn('npx', ['expo', 'start', ...process.argv.slice(3)], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('exit', (code) => process.exit(code ?? 0))
