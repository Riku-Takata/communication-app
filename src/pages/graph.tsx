// client/src/pages/graph.tsx

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import axios from 'axios'

// サーバーサイドレンダリングを避けるために動的インポート
const NetworkGraph = dynamic(() => import('../components/NetworkGraph'), { ssr: false })

interface Member {
  _id: string
  name: string
}

interface Communication {
  _id: string
  from: Member
  to: Member
  timestamp: string
}

const GraphPage = () => {
  const [user, setUser] = useState<Member | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      // ログインしていない場合はログインページへリダイレクト
      window.location.href = '/login'
    }
  }, [])

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h2>ネットワークグラフ</h2>
      <NetworkGraph user={user} />
    </div>
  )
}

export default GraphPage
