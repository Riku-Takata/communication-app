// client/src/components/Navbar.tsx

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface Member {
  _id: string
  name: string
}

const Navbar = () => {
  const router = useRouter()
  const [user, setUser] = React.useState<Member | null>(null)

  React.useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  return (
    <nav>
      <ul>
        <li><Link href="/graph">ネットワークグラフ</Link></li>
        {user?.name === 'admin' ? (
          <>
            <li><Link href="/add-member">メンバー追加</Link></li>
          </>
        ) : (
          <>
            <li><Link href="/input">コミュニケーション入力</Link></li>
          </>
        )}
        {user && (
          <li><button onClick={handleLogout}>ログアウト</button></li>
        )}
      </ul>
      <style jsx>{`
        nav {
          background-color: #333;
          padding: 1em;
        }
        ul {
          list-style: none;
          display: flex;
          gap: 1em;
          margin: 0;
          padding: 0;
        }
        li {
          color: white;
        }
        a, button {
          color: white;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
        }
        a:hover, button:hover {
          text-decoration: underline;
        }
      `}</style>
    </nav>
  )
}

export default Navbar
