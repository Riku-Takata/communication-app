// client/src/components/NetworkGraph.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

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

interface NodeProps {
  position: [number, number, number]
  name: string
  selected: boolean
  onClick: () => void
}

interface EdgeProps {
  start: [number, number, number]
  end: [number, number, number]
  weight: number
  color: string
}

const Node: React.FC<NodeProps> = ({ position, name, selected, onClick }) => {
  const mesh = useRef<THREE.Mesh>(null!)
  const [hovered, setHover] = useState(false)

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.01
      mesh.current.rotation.y += 0.01
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        scale={selected ? [1.5, 1.5, 1.5] : [1, 1, 1]}
        onClick={onClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
      </mesh>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  )
}

const Edge: React.FC<EdgeProps> = ({ start, end, weight, color }) => {
  const ref = useRef<THREE.BufferGeometry>(null!)

  const positions = useMemo(() => {
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]
  }, [start, end])

  useEffect(() => {
    if (ref.current) {
      const positionArray = new Float32Array([
        positions[0].x, positions[0].y, positions[0].z,
        positions[1].x, positions[1].y, positions[1].z,
      ])
      ref.current.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
    }
  }, [positions])

  return (
    <line>
      <bufferGeometry ref={ref} />
      <lineBasicMaterial color={color} linewidth={weight * 5} />
    </line>
  )
}

interface NetworkGraphProps {
  user: Member
}

const NetworkGraph: React.FC<NetworkGraphProps> = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [communications, setCommunications] = useState<Communication[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersResponse, communicationsResponse] = await Promise.all([
          axios.get('/api/members'),
          axios.get('/api/communications'),
        ])
        const membersData: Member[] = membersResponse.data.filter((member: Member) => member.name !== 'admin')
        const communicationsData: Communication[] = communicationsResponse.data.filter(
          (comm: Communication) => comm.from.name !== 'admin' && comm.to.name !== 'admin'
        )
        setMembers(membersData)
        setCommunications(communicationsData)
      } catch (error) {
        console.error('データの取得に失敗しました', error)
      }
    }

    fetchData()
  }, [])

  // ノードの配置を計算
  const nodePositions = useMemo(() => {
    const angleStep = (Math.PI * 2) / members.length
    return members.map((member, index) => {
      const angle = index * angleStep
      const radius = 5
      return {
        id: member._id,
        name: member.name,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0,
        ] as [number, number, number],
      }
    })
  }, [members])

  // ノードIDと位置のマッピング
  const nodePositionMap = useMemo(() => {
    const map: { [key: string]: [number, number, number] } = {}
    nodePositions.forEach(node => {
      map[node.id] = node.position
    })
    return map
  }, [nodePositions])

  // コミュニケーション量の計算
  // const communicationCounts = useMemo(() => {
  //   const counts: { [key: string]: number } = {}
  //   communications.forEach(comm => {
  //     const fromId = comm.from._id
  //     const toId = comm.to._id
  //     counts[fromId] = (counts[fromId] || 0) + 1
  //     counts[toId] = (counts[toId] || 0) + 1
  //   })
  //   return counts
  // }, [communications])

  // エッジデータの作成
  const edges = useMemo(() => {
    const edgeCounts: { [key: string]: number } = {}
    communications.forEach(comm => {
      const fromId = comm.from._id
      const toId = comm.to._id
      const key = `${fromId}-${toId}`
      edgeCounts[key] = (edgeCounts[key] || 0) + 1
    })

    return communications.map(comm => {
      const fromId = comm.from._id
      const toId = comm.to._id
      const key = `${fromId}-${toId}`
      const weight = edgeCounts[key]

      // コミュニケーション量に応じて色を設定
      const color = weight > 5 ? 'black' : 'red'

      return {
        source: fromId,
        target: toId,
        weight,
        color,
      }
    })
  }, [communications])

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 15] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        {nodePositions.map(node => (
          <Node
            key={node.id}
            position={node.position}
            name={node.name}
            selected={selectedNode === node.id}
            onClick={() => setSelectedNode(node.id)}
          />
        ))}

        {edges.map((edge, index) => {
          const start = nodePositionMap[edge.source]
          const end = nodePositionMap[edge.target]
          const weight = edge.weight

          return <Edge key={index} start={start} end={end} weight={weight} color={edge.color} />
        })}

        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default NetworkGraph
