import { JitsiMeeting } from '@jitsi/react-sdk'

interface JitsiMeetingRoomProps {
  roomName: string
  displayName: string
  email?: string
  onReadyToClose?: () => void
}

export function JitsiMeetingRoom({ roomName, displayName, email = '', onReadyToClose }: JitsiMeetingRoomProps) {
  return (
    <div className="w-full h-full min-h-0 overflow-hidden bg-bg-alt">
      <JitsiMeeting
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        userInfo={{ displayName, email }}
        getIFrameRef={(parentNode: HTMLDivElement) => {
          parentNode.style.height = '100%'
          parentNode.style.width = '100%'
        }}
        onApiReady={(externalApi: unknown) => {
          // La API de Jitsi está lista; se puede extender para escuchar eventos.
          // eslint-disable-next-line no-console
          console.log('Jitsi API ready', externalApi)
        }}
        onReadyToClose={onReadyToClose}
      />
    </div>
  )
}
