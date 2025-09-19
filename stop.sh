#!/bin/bash

# ParseFlow Stop Script
# This script stops the ParseFlow application server

echo "🛑 Stopping ParseFlow..."

# Check if PID file exists
if [[ ! -f ".parseflow/server.pid" ]]; then
    echo "⚠️  No server PID file found"
    echo "Checking for any running http-server processes..."
    
    # Try to kill any http-server processes running in this directory
    pkill -f "http-server.*$(pwd)" 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Stopped running http-server processes"
    else
        echo "ℹ️  No ParseFlow server appears to be running"
    fi
    exit 0
fi

# Read PID from file
server_pid=$(cat .parseflow/server.pid 2>/dev/null)

if [[ -z "$server_pid" ]]; then
    echo "❌ Could not read server PID"
    exit 1
fi

# Check if process is running
if kill -0 $server_pid 2>/dev/null; then
    echo "📄 Found server process (PID: $server_pid)"
    
    # Try graceful shutdown first
    echo "🔄 Attempting graceful shutdown..."
    kill -TERM $server_pid
    
    # Wait for process to stop
    for i in {1..10}; do
        if ! kill -0 $server_pid 2>/dev/null; then
            echo "✅ Server stopped gracefully"
            break
        fi
        sleep 1
        echo "⏳ Waiting for server to stop... ($i/10)"
    done
    
    # Force kill if still running
    if kill -0 $server_pid 2>/dev/null; then
        echo "⚠️  Forcing server shutdown..."
        kill -KILL $server_pid 2>/dev/null
        
        if kill -0 $server_pid 2>/dev/null; then
            echo "❌ Failed to stop server"
            exit 1
        else
            echo "✅ Server force stopped"
        fi
    fi
else
    echo "ℹ️  Server process (PID: $server_pid) is not running"
fi

# Clean up files
if [[ -f ".parseflow/server.pid" ]]; then
    rm .parseflow/server.pid
    echo "🧹 Cleaned up PID file"
fi

# Show logs if they exist
if [[ -f ".parseflow/server.log" ]]; then
    echo ""
    echo "📝 Last few log lines:"
    tail -5 .parseflow/server.log
fi

echo ""
echo "🎉 ParseFlow server stopped successfully!"
