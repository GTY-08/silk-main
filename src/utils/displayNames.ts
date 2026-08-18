const EMOTION_NAMES: Record<string, string> = {
  angry: '분노',
  calm: '평온',
  fear: '불안',
  happy: '기쁨',
  love: '사랑',
  sad: '슬픔',
}

const SHAPE_NAMES: Record<string, string> = {
  square: '사각형',
  circle: '원',
  triangle: '삼각형',
  diamond: '다이아',
  star: '별',
  heart: '하트',
  droplet: '물방울',
  wave: '다이아',
}

const SOUND_NAMES: Record<string, string> = {
  chime: '맑은 종',
  rain: '빗소리',
  piano: '피아노',
  drum: '드럼',
}

export function emotionName(value?: string | null) {
  return value ? EMOTION_NAMES[value.toLowerCase()] || value : '분석 전'
}

export function shapeName(value?: string | null) {
  return value ? SHAPE_NAMES[value.toLowerCase()] || value : '-'
}

export function soundName(value?: string | null) {
  return value ? SOUND_NAMES[value.toLowerCase()] || value : '-'
}
