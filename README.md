# gds3710-hass-card
Grandstream GDS3710 Home assistant card

## Base view

![fold](https://user-images.githubusercontent.com/115714448/196985483-447eafdd-1637-4888-adca-08cac052e837.png)

## Unfold when call incomming

![unfold](https://user-images.githubusercontent.com/115714448/196985548-cff5c7a3-cfe3-4e30-b908-500a3304543e.png)

## On error
![error](https://user-images.githubusercontent.com/115714448/196998651-be3a1863-50d0-4488-b35b-4ace3064f98a.png)

## Installation
```yaml
resources:
  - type: js
    url: /local/gds3710/jssip-3.3.6.min.js
  - type: module
    url: /local/gds3710/index.js
```
## Card configuration
```yaml
type: custom:gds3710-card
camera_entity: camera.gds3710
sip:
  username: username
  password: password
  server: 192.168.1.1
  port: 8089
title: Card title
icons:
  main: mdi:doorbell-video
  accept_call: mdi:phone
  reject_call: mdi:phone-hangup
debug: false
```
If debug show trace in browser console

## Open door

### Challenge+Response Authentication

**Create a new switch**
```yaml
switch:
  - platform: command_line
    switches:
      gds3710_door:
        command_on: "/config/www/gds3710/opendoor.sh"
        friendly_name: GDS3710 Open door
```

**Card configuration**

```yaml
type: custom:gds3710-card
camera_entity: camera.gds3710
sip:
  username: username
  password: password
  server: 192.168.1.1
  port: 8089
title: Card title
icons:
  main: mdi:doorbell-video
  accept_call: mdi:phone
  reject_call: mdi:phone-hangup
debug: false
door:
  icon: mdi:door-open
  color: yellow
  type: switch
  entity: switch.gds3710_door
```

### DTMF

***You must enable whitelist and add number on GDS, Phone Settings > Account 1 White List***
```yaml
type: custom:gds3710-card
camera_entity: camera.gds3710
sip:
  username: username
  password: password
  server: 192.168.1.1
  port: 8089
title: Card title
icons:
  main: mdi:doorbell-video
  accept_call: mdi:phone
  reject_call: mdi:phone-hangup
debug: false
door:
  icon: mdi:door-open
  color: null
  type: dtmf
  dtmf_signal: 1234
```

## Ringbell & Fullykiosk

I'm using a Aeotec Z-Wave Siren 6 and create a webhook for ringing 

### Create a fullykiosk command

```yaml
shell_command:
  fullykiosk_cmd: curl -i 'http://fullykiosk.host/?cmd={{ cmd }}&password=mypassword'
```
### Automation
This automation wake up fullykiosk and ring 2 times

```yaml
alias: Intercom call in
description: ""
trigger:
  - platform: webhook
    webhook_id: my-gds-webhook-id
condition: []
action:
  - service: shell_command.fullykiosk_cmd
    data:
      cmd: screenOn
  - repeat:
      count: "2"
      sequence:
        - service: siren.turn_on
          data: {}
          target:
            entity_id: siren.indoor_siren_6_3
    enabled: true
mode: single
```
### Pbx call webhook
```
; webrtc exten
exten => 1000,1,NoOp(WEBSOCKET)
same => n,System(curl -X POST 'https://my-home-assistant.tld/api/webhook/my-gds-webhook-id')
same => n,Wait(5)
same => n,Dial(PJSIP/1001, 30)
```

## See also
- [sip-hass-card](https://github.com/TECH7Fox/sip-hass-card)
- [DoorDroid](https://github.com/rdehuyss/DoorDroid)
