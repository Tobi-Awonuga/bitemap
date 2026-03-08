import nodemailer from 'nodemailer'

type PasswordResetEmailInput = {
  to: string
  displayName: string
  resetUrl: string
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = parseBool(process.env.SMTP_SECURE, false)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass || !Number.isFinite(port)) return null

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

export function emailEnabled(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<boolean> {
  const transporter = createTransport()
  if (!transporter) return false

  const from = process.env.SMTP_FROM ?? 'BiteMap <no-reply@bitemap.local>'
  const expiresMinutes = 60
  const text = [
    `Hi ${input.displayName},`,
    '',
    'We received a request to reset your BiteMap password.',
    `Reset your password: ${input.resetUrl}`,
    '',
    `This link expires in ${expiresMinutes} minutes.`,
    'If you did not request this, you can ignore this email.',
  ].join('\n')

  const html = `
    <p>Hi ${input.displayName},</p>
    <p>We received a request to reset your BiteMap password.</p>
    <p><a href="${input.resetUrl}">Reset password</a></p>
    <p>This link expires in ${expiresMinutes} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `

  await transporter.sendMail({
    from,
    to: input.to,
    subject: 'Reset your BiteMap password',
    text,
    html,
  })

  return true
}
