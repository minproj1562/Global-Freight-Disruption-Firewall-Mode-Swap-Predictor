import asyncio
import websockets
import json
import sys

async def listen_fleet_websocket():
    uri = "ws://localhost:8000/ws/fleet"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for messages...")
            while True:
                message = await websocket.recv()
                try:
                    data = json.loads(message)
                    print(f"\nReceived Fleet Update:")
                    print(json.dumps(data, indent=2))
                except json.JSONDecodeError:
                    print(f"Received raw message: {message}")
    except websockets.exceptions.ConnectionClosed:
        print("Connection closed by server.")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(listen_fleet_websocket())

    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)
