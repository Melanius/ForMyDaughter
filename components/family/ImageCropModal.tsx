'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Upload, RotateCw } from 'lucide-react'

interface ImageCropModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (croppedImageBlob: Blob) => Promise<void>
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropModal({ isOpen, onClose, onSave }: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isUploading, setIsUploading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 이미지 선택 처리
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '')
      })
      reader.readAsDataURL(e.target.files[0])
    }
  }

  // 이미지 로드 완료 시 크롭 영역 설정
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1)) // 1:1 비율 (정사각형)
  }, [])

  // 크롭된 이미지를 Blob으로 변환
  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      // 캔버스 크기 설정 (정사각형, 최대 400x400)
      const size = Math.min(400, crop.width, crop.height)
      canvas.width = size
      canvas.height = size

      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        size,
        size,
      )

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          0.8, // 품질 80%
        )
      })
    },
    [],
  )

  // 저장 처리
  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) {
      return
    }

    try {
      setIsUploading(true)
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop)
      await onSave(croppedImageBlob)
      onClose()
    } catch (error) {
      console.error('이미지 크롭 실패:', error)
      alert('이미지 처리에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsUploading(false)
    }
  }, [completedCrop, getCroppedImg, onSave, onClose])

  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    setImageSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">프로필 사진 설정</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          {!imageSrc ? (
            // 파일 선택 화면
            <div className="text-center py-12">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="hidden"
              />
              <div className="mb-6">
                <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  프로필 사진을 선택해주세요
                </h4>
                <p className="text-gray-600">
                  정사각형으로 자동 조정됩니다
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                이미지 선택
              </button>
            </div>
          ) : (
            // 크롭 화면
            <div className="space-y-4">
              <div className="flex justify-center bg-gray-50 rounded-xl p-4">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1} // 1:1 정사각형
                  className="max-w-full max-h-96"
                >
                  <img
                    ref={imgRef}
                    alt="크롭할 이미지"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-96 object-contain"
                  />
                </ReactCrop>
              </div>

              {/* 버튼들 */}
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  다른 이미지 선택
                </button>
                <button
                  onClick={handleSave}
                  disabled={!completedCrop || isUploading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  {isUploading ? '업로드 중...' : '저장하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}