from AgriMic import AgriMic
import sys

def main():
    print("Initializing AgriMic...")
    mic = AgriMic()
    
    print("Starting voice loop. Say 'exit' to quit.")
    try:
        while True:
            command = mic.listen()

            if "exit" in command:
                print("Agri shutting down...")
                break

            if command:
                print("Command received:", command)
            else:
                # pass or handle empty command (e.g. noise)
                pass
                
    except KeyboardInterrupt:
        print("\nInterrupted by user. Shutting down...")
        sys.exit(0)

if __name__ == "__main__":
    main()
