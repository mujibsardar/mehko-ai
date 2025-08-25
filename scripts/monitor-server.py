#!/usr/bin/env python3
"""
MEHKO AI Server Performance Monitor
Monitors CPU, memory, and process performance for all services
"""

import psutil
import time
import argparse
import subprocess
import socket
from datetime import datetime

def check_port_listening(port):
    """Check if a port is listening using socket connection"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        return result == 0
    except:
        return False

def get_process_info(port):
    """Get process information for a specific port using multiple methods"""
    try:
        # Method 1: Try using lsof command (more reliable on macOS)
        try:
            result = subprocess.run(['lsof', '-Pi', f':{port}', '-sTCP:LISTEN', '-t'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0 and result.stdout.strip():
                pid = int(result.stdout.strip().split('\n')[0])
                process = psutil.Process(pid)
                return {
                    'pid': pid,
                    'name': process.name(),
                    'cpu_percent': process.cpu_percent(),
                    'memory_percent': process.memory_percent(),
                    'memory_mb': process.memory_info().rss / 1024 / 1024,
                    'status': process.status()
                }
        except (subprocess.TimeoutExpired, subprocess.SubprocessError, ValueError):
            pass
        
        # Method 2: Fallback to psutil.net_connections
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                pid = conn.pid
                if pid:
                    process = psutil.Process(pid)
                    return {
                        'pid': pid,
                        'name': process.name(),
                        'cpu_percent': process.cpu_percent(),
                        'memory_percent': process.memory_percent(),
                        'memory_mb': process.memory_info().rss / 1024 / 1024,
                        'status': process.status()
                    }
        
        # Method 3: Try socket connection test
        if check_port_listening(port):
            # Port is listening but we couldn't get process info
            return {
                'pid': None,
                'name': 'Unknown',
                'cpu_percent': 0.0,
                'memory_percent': 0.0,
                'memory_mb': 0.0,
                'status': '🟢 Running'
            }
            
    except (psutil.NoSuchProcess, psutil.AccessDenied, Exception):
        pass
    return None

def get_system_stats():
    """Get overall system statistics"""
    return {
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'memory_available_gb': psutil.virtual_memory().available / 1024 / 1024 / 1024,
        'disk_usage': psutil.disk_usage('/').percent
    }

def get_port_info():
    """Get information about all monitored ports"""
    ports = {
        8000: "Python FastAPI",
        3000: "Node.js Server", 
        5173: "React Dev Server"
    }
    
    port_info = {}
    for port, service_name in ports.items():
        process_info = get_process_info(port)
        if process_info and (process_info['pid'] is not None or process_info['status'] == '🟢 Running'):
            # Create a clean status entry, ensuring our emoji status is preserved
            port_info[port] = {
                'service': service_name,
                'status': '🟢 Running',
                'pid': process_info.get('pid'),
                'name': process_info.get('name', 'Unknown'),
                'cpu_percent': process_info.get('cpu_percent', 0.0),
                'memory_percent': process_info.get('memory_percent', 0.0),
                'memory_mb': process_info.get('memory_mb', 0.0)
            }
        else:
            port_info[port] = {
                'service': service_name,
                'status': '🔴 Not Running'
            }
    
    return port_info

def print_summary():
    """Print a single performance summary"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    system = get_system_stats()
    ports = get_port_info()
    
    print(f"\n{'='*60}")
    print(f"🚀 MEHKO AI Performance Monitor - {timestamp}")
    print(f"{'='*60}")
    
    # System Overview
    print(f"\n💻 System Overview:")
    print(f"   CPU Usage: {system['cpu_percent']:>6.1f}%")
    print(f"   Memory:    {system['memory_percent']:>6.1f}% ({system['memory_available_gb']:>5.1f} GB available)")
    print(f"   Disk:      {system['disk_usage']:>6.1f}%")
    
    # Service Status
    print(f"\n🔧 Service Status:")
    for port, info in ports.items():
        if 'status' in info and info['status'] == '🟢 Running':
            print(f"   {info['service']:<20} {info['status']} (PID: {info['pid']})")
            print(f"     CPU: {info['cpu_percent']:>6.1f}% | Memory: {info['memory_mb']:>6.1f} MB")
        else:
            print(f"   {info['service']:<20} {info['status']}")
    
    # High CPU Processes
    print(f"\n🔥 High CPU Processes (>5%):")
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                cpu_percent = proc.info['cpu_percent']
                if cpu_percent is not None and cpu_percent > 5.0:
                    processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        
        for proc in processes[:10]:  # Top 10
            print(f"   {proc['name']:<20} PID: {proc['pid']:>6} | CPU: {proc['cpu_percent']:>6.1f}% | Mem: {proc['memory_percent']:>6.1f}%")
    except Exception as e:
        print(f"   Error getting process info: {e}")
    
    print(f"\n{'='*60}")

def continuous_monitoring(interval=5, log_file=None):
    """Run continuous monitoring"""
    print(f"🚀 Starting continuous monitoring (every {interval} seconds)")
    print(f"Press Ctrl+C to stop")
    
    try:
        while True:
            print_summary()
            
            if log_file:
                # Save to log file
                with open(log_file, 'a') as f:
                    f.write(f"{datetime.now().isoformat()}\n")
                    # Could add more detailed logging here
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print(f"\n🛑 Monitoring stopped by user")
    except Exception as e:
        print(f"\n❌ Error during monitoring: {e}")

def main():
    parser = argparse.ArgumentParser(description='MEHKO AI Server Performance Monitor')
    parser.add_argument('--continuous', '-c', action='store_true', 
                       help='Run continuous monitoring')
    parser.add_argument('--interval', '-i', type=int, default=5,
                       help='Monitoring interval in seconds (default: 5)')
    parser.add_argument('--log', '-l', type=str,
                       help='Log file path for continuous monitoring')
    
    args = parser.parse_args()
    
    if args.continuous:
        continuous_monitoring(args.interval, args.log)
    else:
        print_summary()

if __name__ == "__main__":
    main()
