#!/bin/bash

# ParseFlow Stop Script
# This script stops the ParseFlow application server and kills all related ports

echo "🛑 Stopping ParseFlow..."

# Function to kill processes on specific port
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    
    # Find processes using the port
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [[ -n "$pids" ]]; then
        echo "⚠️  Found processes on port $port: $pids"
        # Kill the processes
        echo "$pids" | xargs kill -TERM 2>/dev/null
        sleep 2
        
        # Check if any processes are still running and force kill them
        local remaining_pids=$(lsof -ti :$port 2>/dev/null)
        if [[ -n "$remaining_pids" ]]; then
            echo "🔪 Force killing remaining processes on port $port: $remaining_pids"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null
        fi
        
        # Verify port is now free
        if lsof -ti :$port >/dev/null 2>&1; then
            echo "❌ Failed to free port $port"
        else
            echo "✅ Port $port is now free"
        fi
    else
        echo "✅ Port $port is already free"
    fi
}

# Kill all processes on ParseFlow ports
echo "🧹 Cleaning up all ParseFlow ports..."
ports=(3000 8080 8000 3001 5000 8888)

for port in "${ports[@]}"; do
    kill_port $port
done

# Also kill any http-server processes running in this directory
echo "🔍 Checking for any remaining http-server processes..."
pkill -f "http-server.*$(pwd)" 2>/dev/null
if [[ $? -eq 0 ]]; then
    echo "✅ Stopped additional http-server processes"
fi

echo ""
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
echo "🎉 ParseFlow server stopped and all ports cleaned up successfully!"
