// SDK 54+ moved getInfoAsync/downloadAsync to the legacy entry; importing from
// "expo-file-system" throws (and floods Expo Go) on every media cache hit.
import * as FileSystem from 'expo-file-system/legacy'
import * as Crypto from 'expo-crypto'
import { useEffect, useMemo, useState } from 'react'
import { isSignedUrlExpired, stripQueryAndHash } from './signedMediaUrl'
import { rewriteLocalUploadUrl } from './resolveImageUrl'

const { getEnvironmentConfig } = require('../../environment.config')

const CACHE_DIR = `${FileSystem.cacheDirectory || ''}signed-media-cache-v2/`
const pendingDownloads = new Map()

const getServerBaseUrl = () => {
  try {
    return getEnvironmentConfig('development')?.SERVER_URL || ''
  } catch {
    return ''
  }
}

const toReachableUrl = (remoteUrl) =>
  rewriteLocalUploadUrl(remoteUrl, getServerBaseUrl())

function getFileExtension(url = '', fallback = 'bin') {
  const clean = stripQueryAndHash(url)
  const filename = clean.split('/').pop() || ''
  const parts = filename.split('.')
  const ext = parts.length > 1 ? parts.pop() : fallback
  return (ext || fallback).toLowerCase()
}

async function ensureCacheDir() {
  if (!FileSystem.cacheDirectory) return
  const info = await FileSystem.getInfoAsync(CACHE_DIR)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true })
  }
}

export async function getCachedMediaUri(remoteUrl, type = 'file') {
  if (!remoteUrl || remoteUrl.startsWith('file://')) return remoteUrl
  if (!FileSystem.cacheDirectory) return toReachableUrl(remoteUrl)

  const reachableUrl = toReachableUrl(remoteUrl)
  const normalized = stripQueryAndHash(reachableUrl)
  const ext = getFileExtension(reachableUrl, type === 'image' ? 'jpg' : 'mp4')
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized)
  const localUri = `${CACHE_DIR}${hash}.${ext}`

  await ensureCacheDir()

  const fileInfo = await FileSystem.getInfoAsync(localUri)
  if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
    return localUri
  }

  if (isSignedUrlExpired(reachableUrl)) {
    return reachableUrl
  }

  const pending = pendingDownloads.get(normalized)
  if (pending) {
    const uri = await pending.promise
    if (uri.startsWith('file://') || pending.remoteUrl === reachableUrl) return uri
    return getCachedMediaUri(reachableUrl, type)
  }

  const downloadPromise = (async () => {
    try {
      const result = await FileSystem.downloadAsync(reachableUrl, localUri)
      if (result.status === 200) return result.uri
      await FileSystem.deleteAsync(localUri, { idempotent: true })
      return reachableUrl
    } catch (_e) {
      try {
        await FileSystem.deleteAsync(localUri, { idempotent: true })
      } catch (_) {}
      return reachableUrl
    } finally {
      pendingDownloads.delete(normalized)
    }
  })()

  pendingDownloads.set(normalized, { remoteUrl: reachableUrl, promise: downloadPromise })
  return downloadPromise
}

export function useCachedMediaUri(remoteUrl, type = 'image') {
  const reachableUrl = useMemo(
    () => toReachableUrl(remoteUrl),
    [remoteUrl]
  )
  const key = useMemo(() => stripQueryAndHash(reachableUrl || ''), [reachableUrl])
  const [source, setSource] = useState({ key, uri: reachableUrl })

  useEffect(() => {
    let isMounted = true

    if (!reachableUrl) {
      setSource({ key, uri: reachableUrl })
      return
    }

    setSource((current) => {
      if (current.key !== key) return { key, uri: reachableUrl }
      return current.uri?.startsWith('file://') ? current : { key, uri: reachableUrl }
    })

    getCachedMediaUri(reachableUrl, type)
      .then((uri) => {
        if (!isMounted) return
        setSource({ key, uri })
      })
      .catch(() => {
        if (!isMounted) return
        setSource({ key, uri: reachableUrl })
      })

    return () => {
      isMounted = false
    }
  }, [reachableUrl, type, key])

  return source.uri
}
