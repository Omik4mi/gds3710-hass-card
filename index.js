import {
  LitElement,
  html,
  css
} from 'https://unpkg.com/lit-element@2.5.1/lit-element.js?module'

class Gds3710Card extends LitElement {
  static get properties () {
    return {
      hass: {},
      config: {},
      session: {},
      debug: { type: Boolean },
      answered: { type: Boolean },
      registred: { type: Boolean },
      error: {}
    }
  }

  constructor () {
    super()
    this.session = null
    this.debug = false
    this.answered = false
    this.registred = false
    this.error = null
  }

  render () {
    this._log('CARD Render')
    return html`
      <ha-card>
        <h1 class="card-header">
          <span id="title" class="name">
            <ha-icon icon="${this.config?.icons?.main || 'mdi:doorbell-video'}"></ha-icon>
            ${this.config.title}
          </span>
          <ha-icon icon="hass:checkbox-blank-circle" style="color:var(--label-badge-${this.registred ? 'green' : 'red'})"></ha-icon>
        </h1>
        ${(this.error !== null) ? html`
          <ha-alert alert-type="error" .title=${this.error.title}>
            ${this.error.message}
          </ha-alert>` : ''
        }

        ${this.session !== null ? html`
          <div class="content"> 
            <ha-camera-stream
              allow-exoplayer
              muted
              .hass=${this.hass}
              .stateObj=${this.hass.states[this.config.camera_entity]}
            ></ha-camera-stream>
            <div class="box">
              <div class="row">
              ${!this.answered ? html`
                <ha-icon-button class="accept-btn" .label=${"Accept Call"} @click="${this._answerHandler}">
                  <ha-icon icon="${this.config?.icons?.accept_call || 'mdi:phone'}"></ha-icon>
                </ha-icon-button>
              `: ''}
              </div>
              <div class="row">
                ${this.config.door ? html`
                  <ha-icon-button @click="${this._openDoorHandler}"
                    .label="Open door" style="color:${this.config.door.color||'inherit'}">
                    <ha-icon icon="${this.config.door.icon}"></ha-icon>
                  </ha-icon-button>` : ''
                }
              </div>
              <div class="row">
                <ha-icon-button class="hangup-btn" .label=${"Decline Call"} @click="${this._hangupHandler}">
                  <ha-icon icon="${this.config?.icons?.reject_call || 'phone-hangup'}"></ha-icon>
               </ha-icon-button>
              </div>
            </div>
          </div>` : ''
        }
      </ha-card>`
  }

  setConfig (config) {
    if (config.door && config.door.type === 'switch' && !config.door.entity) {
      throw new Error(`Door switch entity is not defined`)
    } else if (config.door && config.door.type === 'dtmf' && !config.door.dtmf_signal) {
      throw new Error(`Door dtmf_signal is not defined`)
    }

    this.config = config
    this._log('CARD set config', this.config)
  }


  firstUpdated () {
    this._initSip()
  }

  static get styles () {
    return css`
      #actions {
        text-align: center;
        padding: 1em;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        padding: 6px 16px 6px 16px;
        line-height: inherit;
        font-weight: bold;
        font-size: var(--card-primary-font-size);
      }
      #title {
        display: flex;
      }
      .box {
        /* start paper-font-common-nowrap style */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* end paper-font-common-nowrap style */
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(
          --ha-picture-card-background-color,
          rgba(0, 0, 0, 0.3)
        );
        padding: 4px 8px;
        font-size: 16px;
        line-height: 40px;
        color: var(--ha-picture-card-text-color, white);
        display: flex;
        justify-content: space-between;
        flex-direction: row;
        margin-top: -70px;
        min-height: 62px;
      }
      .box .title {
        font-weight: 500;
        margin-left: 8px;
      }
      .row {
        display: flex;
        flex-direction: row;
      }
      .container {
        transition: filter 0.2s linear 0s;
        width: 80vw;
      }
      .box, ha-icon {
        display: flex;
        align-items: center;
      }
      .accept-btn {
        color: var(--label-badge-green);
      }
      .hangup-btn {
        color: var(--label-badge-red);
      }
      ha-camera-stream {
        height: auto;
        width: 100%;
        display: block;
      }
      .content {
        outline: none;
        align-self: stretch;
        flex-grow: 1;
        display: flex;
        flex-flow: column;
        background-color: var(--secondary-background-color);
      }
    `
  }

  _initSip () {
    const self = this
    const wss = `wss://${this.config.sip.server}:${this.config.sip.port}/ws`
    
    this._log(`Trying to connect to ${wss}`)

    const socket = new JsSIP.WebSocketInterface(wss)
    const sipConfig = {
      uri: `sip:${this.config.sip.username}@${this.config.sip.server}`,
      password: this.config.sip.password
    }

    this._log('SIP Config', sipConfig)

    const ua = new JsSIP.UA({
      sockets: [socket],
      ...sipConfig
    })

    ua.on('connected', function (e) {
      self._log('SIP Connected', e)
    })

    ua.on('disconnected', function (e) {
      self._log('SIP Disconnected', e)
      self.error = {
        title: 'SIP connection failed',
        message: e.cause || `Reason:"${e.error.reason}"|Code: ${e.error.code}`
      }
      throw new Error('SIP disconnected', e.cause || `Reason:"${e.error.reason}"|Code: ${e.error.code}`)
    })

    ua.on('registered', function (e) {
      self.registred = true
      self._log('SIP Registred', e)
    })

    ua.on('unregistered', function (e) {
      self._log('SIP Unregistred', e)
    })

    ua.on('registrationFailed', function (e) {
      self._log('SIP Registration Failed', e)
      self.error = {
        title: 'SIP registration failed',
        message: e.cause
      }

      throw new Error('SIP Registration failed', e.cause)
    })

    ua.on('newRTCSession', function (e) {
      self._log('RTC New Session', e)
      self.session = e.session

      self.session.on('confirmed', function (e) {
        self._log('RTC Session confirmed', e)
      })
      self.session.on('ended', function (e) {
        self._log('RTC Session ended', e)
        self._clear()
      })
      self.session.on('failed', function (e) {
        self._log('RTC Session failed', e)
        self._clear()
      })

      if (self.session.direction === 'incoming') {
        self._log('RTC Session incomming', e)
        self.session.on('peerconnection', function () {
          self.session.connection.addEventListener('addstream', (e) => {
            const remoteAudio = document.createElement('audio')
            remoteAudio.srcObject = e.stream
            remoteAudio.play()
          })
        })
      }
    })

    ua.start()
  }

  async _openDoorHandler () {
    this._log('Open door handler')

    if (this.config.door.type === 'dtmf') {
      this._log('Handle dtmf')
      this.session.sendDTMF(this.config.door.dtmf_signal)
    } else if (this.config.door.type === 'switch') {
      this._log('Handle switch')

      await this.hass.callService('switch', 'turn_on', {
        entity_id: this.config.door.entity
      })
    }
  }

  _answerHandler () {
    this._log('CALL Answered')
    this.session.answer({
      mediaConstraints: {
        audio: true,
        video: false
      }
    })
    this.answered = true
  }

  _hangupHandler () {
    this._log('CALL Hangup')
    this.session.terminate()
    this._clear()
  }

  _clear () {
    this.session = null
    this.answered = false
  }

  _log () {
    if (this.config.debug !== true) {
      return
    }
    console.log(...arguments)
  }
}

customElements.define('gds3710-card', Gds3710Card)
