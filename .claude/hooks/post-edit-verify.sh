#!/bin/bash
# Hook: 파일 수정 후 TypeScript 타입 오류 자동 체크
# 트리거: PostToolUse (Edit, Write)

CHANGED_FILE="$1"

# .tsx/.ts 파일이 수정된 경우에만 체크
if [[ "$CHANGED_FILE" == *.tsx ]] || [[ "$CHANGED_FILE" == *.ts ]]; then
  echo "🔍 TypeScript 타입 체크 중..."
  cd /Users/codeit_intern/everyoneMap

  # tsc --noEmit 으로 타입 오류만 체크 (빌드 없이)
  result=$(npx tsc --noEmit 2>&1)

  if [ $? -ne 0 ]; then
    echo "❌ TypeScript 오류 발견:"
    echo "$result"
    exit 1
  else
    echo "✅ TypeScript 타입 체크 통과"
  fi
fi
