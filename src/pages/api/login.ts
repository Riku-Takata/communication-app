// client/src/pages/api/login.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from '../../utils/dbConnect'
import Member from '@/models/Member'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'POST':
      const { name, password } = req.body
      if (!name || !password) {
        return res.status(400).json({ message: '名前とパスワードは必須です' })
      }
      try {
        const member = await Member.findOne({ name })
        if (!member) {
          return res.status(400).json({ message: '名前またはパスワードが正しくありません' })
        }
        const isMatch = await bcrypt.compare(password, member.password)
        if (!isMatch) {
          return res.status(400).json({ message: '名前またはパスワードが正しくありません' })
        }
        // 本来はJWTトークンやセッションを発行するべきですが、ここでは簡略化します
        res.status(200).json({ message: 'ログイン成功', member })
      } catch (error) {
        console.error('error:', error);
        res.status(500).json({ message: 'サーバーエラー' })
      }
      break
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
