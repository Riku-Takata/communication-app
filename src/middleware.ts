// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(req: Request) {
  const basicAuth = req.headers.get('authorization')
  if (!basicAuth) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"'
      }
    })
  }

  const authValue = basicAuth.split(' ')[1]
  const [user, password] = atob(authValue).split(':')

  if (
    user === process.env.BASIC_ID &&
    password === process.env.BASIC_PWD
  ) {
    return NextResponse.next()
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"'
    }
  })
}