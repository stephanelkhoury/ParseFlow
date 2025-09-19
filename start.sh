#!/bin/bash

# ParseFlow Start Script
# This script starts the ParseFlow application server

echo "🚀 Starting ParseFlow..."

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start server on available port
start_server() {
    local port=$1
    echo "📡 Starting server on port $port..."
    
    # Create PID file directory if it doesn't exist
    mkdir -p .parseflow
    
    # Start the server in background and save PID
    npx http-server . -p $port -o --cors > .parseflow/server.log 2>&1 &
    local server_pid=$!
    
    # Save PID to file
    echo $server_pid > .parseflow/server.pid
    
    # Wait a moment for server to start
    sleep 2
    
    # Check if server is running
    if kill -0 $server_pid 2>/dev/null; then
        echo "✅ ParseFlow server started successfully!"
        echo "🌐 Server running on: http://localhost:$port"
        echo "📄 PID: $server_pid (saved to .parseflow/server.pid)"
        echo "📝 Logs: .parseflow/server.log"
        echo ""
        echo "💡 To stop the server, run: ./stop.sh or npm run stop"
        
        # Open browser if not in CI/automated environment
        if [[ -z "$CI" && -z "$AUTOMATED" ]]; then
            echo "🔗 Opening browser..."
            sleep 1
            if command -v open >/dev/null 2>&1; then
                open "http://localhost:$port"
            elif command -v xdg-open >/dev/null 2>&1; then
                xdg-open "http://localhost:$port"
            fi
        fi
        
        return 0
    else
        echo "❌ Failed to start server on port $port"
        return 1
    fi
}

# Try different ports
ports=(3000 8080 8000 3001 5000 8888)

for port in "${ports[@]}"; do
    if check_port $port; then
        echo "⚠️  Port $port is already in use, trying next port..."
    else
        if start_server $port; then
            exit 0
        fi
    fi
done

echo "❌ Could not start server on any available port"
echo "Please check if other servers are running and try again"
exit 1
