// client/src/pages/api/communications.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from '../../utils/dbConnect'
import Communication from '../../models/Communication'
import Member from '../../models/Member'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const communications = await Communication.find().populate('from').populate('to')
        res.status(200).json(communications)
      } catch (error) {
        res.status(500).json({ message: 'サーバーエラー' })
      }
      break
    case 'POST':
      const { from, to } = req.body
      if (!from || !to) {
        return res.status(400).json({ message: 'from と to は必須です' })
      }
      try {
        // `admin` が含まれていないか確認
        const fromMember = await Member.findById(from)
        const toMember = await Member.findById(to)
        if (!fromMember || !toMember) {
          return res.status(400).json({ message: '有効なメンバーIDを指定してください' })
        }
        if (fromMember.name === 'admin' || toMember.name === 'admin') {
          return res.status(400).json({ message: '`admin` はコミュニケーションに含めることができません' })
        }

        const communication = new Communication({ from, to })
        await communication.save()
        res.status(201).json(communication)
      } catch (error) {
        res.status(400).json({ message: 'コミュニケーションの記録に失敗しました' })
      }
      break
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
