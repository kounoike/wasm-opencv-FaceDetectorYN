import { NextPage } from 'next'
import Head from 'next/head'
import Webcam from 'react-webcam'
import { Button, Form, Input, Select } from 'antd'
import styles from '../styles/Home.module.css'
import 'antd/dist/antd.css'
import React from 'react'
import { transformStream } from '../lib/transformStream'
import { getFaceDetectTransformer } from '../lib/faceDetectTransformer'
import { WasmModule } from '../lib/faceDetectWasmModule'
// import { createWasmModule } from '../lib/faceDetectWasmModule'
import { useAsync, useLocalStorage } from 'react-use'
import Sora, { ConnectionOptions, ConnectionPublisher } from 'sora-js-sdk'
// import segmentation_simd_thread from '../../lib/wasm/segmentation_simd_thread'
// import '../../lib/wasm/segmentation_simd_thread.worker'
// import '../../lib/wasm/segmentation_simd_thread.wasm'

declare function createWasmModule (): Promise<WasmModule>
declare function createWasmSimdThreadsModule (): Promise<WasmModule>

const SegBbox: NextPage = () => {
  const [videoDeviceId, setVideoDeviceId] = useLocalStorage('videoDeviceId', '')
  const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([])
  const [audioDeviceId, setAudioDeviceId] = useLocalStorage('audioDeviceId', '')
  const [audioDevices, setAudioDevices] = React.useState<MediaDeviceInfo[]>([])
  const [channelId, setChannelId] = useLocalStorage<string>('channelId', '')
  const [signalingKey, setSignalingKey] = useLocalStorage<string>(
    'signalingKey',
    ''
  )
  const [connected, setConnected] = React.useState(false)
  const [sendonly, setSendonly] = React.useState<ConnectionPublisher | null>(
    null
  )
  const [stopFunc, setStopFunc] = React.useState<() => void>(() => () => {
    console.log('default stop func')
  })
  const webcamRef = React.useRef<Webcam>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [transformedStream, setTransformedStream] = React.useState<
    MediaStream
  >()
  const wasmModuleState = useAsync(async () => {
    await new Promise(resolve => {
      console.log('creating script dom node')
      const script = document.createElement('script')
      script.onload = () => {
        console.log('wasm js script load done.')
        resolve(script)
      }
      script.src = '/webnn-polyfill.js'
      // script.src = '/wasm/wasm_simd_threads.js'
      document.body.appendChild(script)
    })

    await new Promise(resolve => {
      console.log('creating script dom node')
      const script = document.createElement('script')
      script.onload = () => {
        console.log('wasm js script load done.')
        resolve(script)
      }
      script.src = '/wasm/wasm.js'
      // script.src = '/wasm/wasm_simd_threads.js'
      document.body.appendChild(script)
    })

    return createWasmModule()
    // return createWasmSimdThreadsModule()
  })

  const handleSelectVideoDevice = (selectedId: string) => {
    setVideoDeviceId(selectedId)
  }
  const handleSelectAudioDevice = (selectedId: string) => {
    setAudioDeviceId(selectedId)
  }

  const handleDevices = React.useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      setVideoDevices(mediaDevices.filter(({ kind }) => kind === 'videoinput'))
      setAudioDevices(mediaDevices.filter(({ kind }) => kind === 'audioinput'))
    },
    [setVideoDevices, setAudioDevices]
  )

  React.useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices)
  }, [handleDevices])

  React.useEffect(() => {
    if (
      !wasmModuleState.loading &&
      webcamRef.current &&
      webcamRef.current.stream
    ) {
      onStreamChanged(webcamRef.current.stream)
    }
  }, [wasmModuleState.loading])

  const onStreamChanged = async (stream: MediaStream) => {
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length > 0) {
      const id = videoTracks[0].getSettings().deviceId
      if (id && videoDeviceId === '') {
        setVideoDeviceId(id)
      }
    }
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length > 0) {
      const id = audioTracks[0].getSettings().deviceId
      if (id && audioDeviceId === '') {
        setAudioDeviceId(id)
      }
    }
    console.log('call stopFunc')
    stopFunc()
    console.log('done.')

    if (videoDevices.length === 1 && videoDevices[0].deviceId === '') {
      navigator.mediaDevices.enumerateDevices().then(handleDevices)
    }

    if (!videoRef.current) {
      console.log('videoRef is null')
      return
    }
    if (!webcamRef.current) {
      console.log('webcamRef is null')
      return
    }
    if (wasmModuleState.loading) {
      const sleep = (msec: number) =>
        new Promise(resolve => setTimeout(resolve, msec))

      console.log('wasmModule loading...', wasmModuleState.loading)
      while (wasmModuleState.loading) {
        await sleep(100)
      }
      console.log('wasmModule load ok!', wasmModuleState.loading)
    }
    if (wasmModuleState.error) {
      console.log('Wasm Module has error', wasmModuleState.error)
      return
    }
    console.log('call transformStream')
    try {
      const transformer = getFaceDetectTransformer(wasmModuleState.value!)
      console.log(transformer)
      const { stream: newStream, stop } = transformStream(
        stream,
        // getTestTransformer()
        transformer
      )
      setTransformedStream(newStream)
      setStopFunc(() => stop)
      console.log('set videoRef')
      videoRef.current.onloadedmetadata = ev => {
        ;(ev.target as HTMLVideoElement).play()
      }
      videoRef.current.srcObject = newStream
      console.log('set videoRef done.')
    } catch (ex) {
      console.log(ex)
    }
  }
  React.useEffect(() => {
    if (!channelId) return
    const sora = Sora.connection([
      'wss://node-01.sora-labo.shiguredo.jp/signaling',
      'wss://node-02.sora-labo.shiguredo.jp/signaling',
      'wss://node-03.sora-labo.shiguredo.jp/signaling',
      'wss://node-04.sora-labo.shiguredo.jp/signaling',
      'wss://node-05.sora-labo.shiguredo.jp/signaling'
    ])
    const metadata = {
      signaling_key: signalingKey
    }
    const options: ConnectionOptions = {
      multistream: true,
      video: true,
      audio: true
    }
    console.log('create sendonly', metadata, options)
    const sendonly = sora.sendonly(channelId, metadata, options)
    setSendonly(prev => {
      prev?.disconnect()
      return sendonly
    })
  }, [channelId, signalingKey])

  const toggleConnect = React.useCallback(() => {
    if (connected) {
      sendonly?.disconnect()
      setConnected(false)
    } else {
      console.log('transformedStream:', transformedStream)
      if (!transformedStream) return
      console.log('connect to sora...')
      sendonly?.connect(transformedStream)
      console.log('done', sendonly)
      setConnected(true)
    }
  }, [transformedStream, connected, setConnected, sendonly])

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name='description' content='Generated by create next app' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <main className={styles.main}>
        <Form className={styles.devices}>
          <Form.Item label='channel'>
            <Input
              type='text'
              value={channelId}
              onChange={ev => {
                setChannelId(ev.target.value)
              }}
            ></Input>
          </Form.Item>
          <Form.Item label='Signaling Key'>
            <Input
              type='password'
              value={signalingKey}
              onChange={ev => {
                setSignalingKey(ev.target.value)
              }}
            ></Input>
          </Form.Item>
          <Form.Item label='Video Device'>
            <Select onSelect={handleSelectVideoDevice} value={videoDeviceId}>
              {videoDevices.map((device, key) => (
                <Select.Option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label='Audio Device'>
            <Select onSelect={handleSelectAudioDevice} value={audioDeviceId}>
              {audioDevices.map((device, key) => (
                <Select.Option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Button onClick={() => toggleConnect()}>
            {connected ? 'Disconnect' : 'Connect'}
          </Button>
        </Form>
        <div>
          <Webcam
            videoConstraints={{
              deviceId: videoDeviceId,
              width: 640,
              height: 480
            }}
            audio={true}
            muted={true}
            audioConstraints={{ deviceId: audioDeviceId }}
            onUserMedia={onStreamChanged}
            ref={webcamRef}
            className='input'
          ></Webcam>
          <video ref={videoRef} muted={true}></video>
        </div>
      </main>

      <footer className={styles.footer}></footer>
    </div>
  )
}

export default SegBbox
