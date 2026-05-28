/**
 * useAvatarWS — manages the WebSocket connection for live processing or file replay.
 *
 * Returns { keypoints, currentFrame, totalFrames, status, play, pause, seek, setSpeed }
 */

import { useRef, useState, useCallback, useEffect } from 'react'

function getWsBase() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

export function useProcessStream(sessionId) {
  const [keypoints, setKeypoints]     = useState(null)
  const [imageKp,   setImageKp]       = useState(null)  // image-space for overlay
  const [currentFrame, setCurrentFrame] = useState(0)
  const [status, setStatus]           = useState('connecting')
  const [frameData, setFrameData]     = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return
    const ws = new WebSocket(`${getWsBase()}/ws/process/${sessionId}`)
    wsRef.current = ws
    setStatus('connecting')

    ws.onopen = () => setStatus('streaming')

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'frame' && msg.data) {
        const d = msg.data
        setFrameData(d)
        setCurrentFrame(d.frame_index ?? 0)
        if (d.pose_detected && d.keypoints_17 && Object.keys(d.keypoints_17).length > 0) {
          setKeypoints(d.keypoints_17)
        }
        if (d.keypoints_image && Object.keys(d.keypoints_image).length > 0) {
          setImageKp(d.keypoints_image)
        }
      } else if (msg.type === 'done') {
        setStatus('done')
      } else if (msg.type === 'error') {
        setStatus('error')
      }
    }

    ws.onerror = () => setStatus('error')
    ws.onclose = () => { if (status !== 'done') setStatus('closed') }

    return () => ws.close()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { keypoints, imageKp, currentFrame, status, frameData }
}

export function useReplayWS(sessionId) {
  const [keypoints, setKeypoints]     = useState(null)
  const [imageKp,   setImageKp]       = useState(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames]   = useState(0)
  const [status, setStatus] = useState('connecting')
  const wsRef    = useRef(null)
  const speedRef = useRef(1.0)
  const fpsRef   = useRef(30)

  useEffect(() => {
    if (!sessionId) return
    const ws = new WebSocket(`${getWsBase()}/ws/replay/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => setStatus('connecting')

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'ready') {
        setTotalFrames(msg.total_frames)
        setStatus('ready')
      } else if (msg.type === 'frame') {
        const d = msg.data
        if (d?.keypoints_17 && Object.keys(d.keypoints_17).length > 0) {
          setKeypoints(d.keypoints_17)
        }
        if (d?.keypoints_image && Object.keys(d.keypoints_image).length > 0) {
          setImageKp(d.keypoints_image)
        }
        if (msg.index !== undefined) setCurrentFrame(msg.index)
      } else if (msg.type === 'replay_done') {
        setStatus('done')
      } else if (msg.type === 'error') {
        setStatus('error')
      }
    }

    ws.onerror = () => setStatus('error')
    ws.onclose = () => {}

    return () => ws.close()
  }, [sessionId])

  function send(msg) {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  const play = useCallback((startFrame) => {
    const sf = startFrame !== undefined ? startFrame : currentFrame
    send({ type: 'play', start_frame: sf, speed: speedRef.current, fps: fpsRef.current })
    setStatus('playing')
  }, [currentFrame])

  const pause = useCallback(() => {
    send({ type: 'pause' })
    setStatus('paused')
  }, [])

  const seek = useCallback((frame) => {
    send({ type: 'seek', frame })
    setCurrentFrame(frame)
    setStatus('paused')
  }, [])

  const setSpeed = useCallback((s) => {
    speedRef.current = s
  }, [])

  const setFps = useCallback((f) => {
    fpsRef.current = f
  }, [])

  return {
    keypoints,
    imageKp,
    currentFrame,
    totalFrames,
    status,
    play,
    pause,
    seek,
    setSpeed,
    setFps,
  }
}
