// client/src/pages/api/members.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from '../../utils/dbConnect'
import Member from '@/models/Member'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const members = await Member.find()
        res.status(200).json(members)
      } catch (error) {
        console.error('error:', error);
        res.status(500).json({ message: 'サーバーエラー' })
      }
      break
    case 'POST':
      const { name, password } = req.body
      if (!name || !password) {
        return res.status(400).json({ message: '名前とパスワードは必須です' })
      }
      try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const newMember = new Member({ name, password: hashedPassword })
        await newMember.save()
        res.status(201).json(newMember)
      } catch (error) {
        console.error('error:', error);
        res.status(400).json({ message: 'メンバーの作成に失敗しました' })
      }
      break
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
