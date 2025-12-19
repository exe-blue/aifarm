#!/bin/bash
# connect_all.sh - 600대 ADB 연결 스크립트

echo "=== 600대 ADB 연결 시작 ==="

# VLAN 10: 10.0.10.1 ~ 10.0.10.254 (254대)
for i in $(seq 1 254); do
    adb connect 10.0.10.$i:5555 &
done
wait

# VLAN 11: 10.0.11.1 ~ 10.0.11.254 (254대)
for i in $(seq 1 254); do
    adb connect 10.0.11.$i:5555 &
done
wait

# VLAN 12: 10.0.12.1 ~ 10.0.12.92 (92대)
for i in $(seq 1 92); do
    adb connect 10.0.12.$i:5555 &
done
wait

echo "=== 연결 완료 ==="
echo "연결된 디바이스 수: $(adb devices | grep ':5555' | wc -l)"

