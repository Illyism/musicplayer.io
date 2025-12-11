import { NextRequest, NextResponse } from "next/server"
import { Constants } from "@/lib/constants"

// Note: Socket.io server needs to be set up separately
// For now, this is a placeholder that will work once Socket.io server is running
let io: any = null

// This will be initialized by a separate Socket.io server
export function setSocketServer(socketServer: any) {
  io = socketServer
}

function getSocketServer() {
  return io
}

/**
 * Remote control API routes
 * Original: GET/POST /remote/:token/:action
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; action: string }> }
): Promise<NextResponse> {
  const { token, action } = await params
  const io = getSocketServer()

  if (!io) {
    return NextResponse.json(
      { control: action, status: false, message: 'Socket server not initialized' },
      { status: 503 }
    )
  }

  // Find socket in room
  const sockets = await io.fetchSockets()
  const socket = sockets.find((s) => s.rooms.has(token))

  if (!socket) {
    return NextResponse.json(
      { control: action, status: false, message: 'Bad token or disconnected' },
      { status: 404 }
    )
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(NextResponse.json({ control: action, status: false, message: 'Request timed out' }, { status: 504 }));
    }, 5000); // 5 second timeout

    const handleResponse = (data: any) => {
      clearTimeout(timeout);
      resolve(
        NextResponse.json({
          control: action,
          status: true,
          data,
        })
      );
    };

    switch (action) {
      case 'user':
        socket.once('answer:user', handleResponse);
        socket.emit('get:user');
        break;

      case 'play':
        socket.once('answer:play', handleResponse);
        socket.emit('get:play');
        break;

      case 'subreddits':
        socket.once('answer:subreddits', handleResponse);
        socket.emit('get:subreddits');
        break;

      case 'song':
        socket.once('answer:song', (data) => {
          clearTimeout(timeout);
          if (data) {
            resolve(
              NextResponse.json({
                control: 'song',
                status: true,
                data,
              })
            );
          } else {
            resolve(
              NextResponse.json({
                control: 'song',
                status: false,
                data: {},
                message: 'No song selected',
              })
            );
          }
        });
        socket.emit('get:song');
        break;

      default:
        clearTimeout(timeout);
        resolve(
          NextResponse.json(
            { control: action, status: false, message: 'Unknown action' },
            { status: 400 }
          )
        );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; action: string }> }
): Promise<NextResponse> {
  const { token, action } = await params
  const io = getSocketServer()

  if (!io) {
    return NextResponse.json(
      { control: action, status: false, message: 'Socket server not initialized' },
      { status: 503 }
    )
  }

  // Find socket in room
  const sockets = await io.fetchSockets()
  const socket = sockets.find((s) => s.rooms.has(token))

  if (!socket) {
    return NextResponse.json(
      { control: action, status: false, message: 'Bad token or disconnected' },
      { status: 404 }
    )
  }

  switch (action) {
    case 'play':
      socket.emit(Constants.CONTROLS_PLAY)
      return NextResponse.json({
        control: 'play',
        status: true,
      })

    case 'forward':
      socket.emit(Constants.CONTROLS_FORWARD)
      return NextResponse.json({
        control: 'forward',
        status: true,
      })

    case 'backward':
      socket.emit(Constants.CONTROLS_BACKWARD)
      return NextResponse.json({
        control: 'backward',
        status: true,
      })

    case 'subreddits':
      const body = await request.json()
      const subreddits = Array.isArray(body['subreddits[]'])
        ? body['subreddits[]'].join('+')
        : body.subreddits || ''
      
      socket.emit(Constants.REMOTE_SUBREDDITS, subreddits)
      return NextResponse.json({
        control: 'subreddits',
        subreddits,
        status: true,
      })

    default:
      return NextResponse.json(
        { control: action, status: false, message: 'Unknown action' },
        { status: 400 }
      )
  }
}
