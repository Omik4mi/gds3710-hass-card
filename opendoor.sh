#!/bin/bash
# GDS3710 Host
HOST=https://192.168.1.1
# GDS3710 Door PIN
PIN=12345
# GDS3710 admin password
PWD=password
RESPONSE=$(curl -s --insecure "${HOST}/goform/apicmd?cmd=0&user=admin")
echo "$RESPONSE"

CHALENGE_CODE=$(sed -ne '/ChallengeCode/{s/.*<ChallengeCode>\(.*\)<\/ChallengeCode>.*/\1/p;q;}' <<< "$RESPONSE")
ID_CODE=$(sed -ne '/IDCode/{s/.*<IDCode>\(.*\)<\/IDCode>.*/\1/p;q;}' <<< "$RESPONSE")

echo "Challenge code: $CHALENGE_CODE"
echo "Id Code: $ID_CODE"

BASE="$CHALENGE_CODE:$PIN:$PWD"
HASH=$(echo -n $BASE|md5sum)
HASH=${HASH::-3}

RESPONSE=$(curl -s --insecure "${HOST}/goform/apicmd?cmd=1&user=admin&authcode=$HASH&idcode=$ID_CODE&type=1")
echo "$RESPONSE"
