#!/bin/bash
# execute_all.sh - 전체 디바이스에 동시 명령 실행

if [ -z "$1" ]; then
    echo "사용법: ./execute_all.sh \"명령어\""
    echo "예시: ./execute_all.sh \"input tap 500 500\""
    exit 1
fi

COMMAND="$1"

echo "=== 전체 디바이스에 명령 실행: $COMMAND ==="

adb devices | grep ':5555' | cut -f1 | while read device; do
    adb -s $device shell "$COMMAND" &
done
wait

echo "=== 전체 실행 완료 ==="

