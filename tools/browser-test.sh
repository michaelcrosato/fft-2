#!/usr/bin/env bash
# Linux/WSL compatibility runner. Browser binaries and libraries come from the
# official image matching the project's installed Playwright version.
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
for tool in docker node sha256sum flock; do
	command -v "$tool" >/dev/null || {
		echo "Missing prerequisite: $tool" >&2
		exit 1
	}
done
playwright_version="$(node -p 'require("playwright/package.json").version')"
image="mcr.microsoft.com/playwright:v${playwright_version}-noble"
project_key="$(printf '%s' "$project_dir" | sha256sum | cut -c1-16)"
lock_key="$(sha256sum package-lock.json | cut -c1-16)"
cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/final-fealty-tactics/browser-tests/$project_key"
output_dir="$project_dir/tools/out/compatibility"
mkdir -p "$cache_dir/docker-config" "$cache_dir/npm" "$cache_dir/$lock_key/node_modules" \
	"$cache_dir/dist" "$output_dir"
exec {runner_lock}>"$cache_dir/runner.lock"
flock --nonblock "$runner_lock" || {
	echo "Another browser compatibility run is using this project's cache and reports." >&2
	exit 1
}

# Firefox needs an audio output device even when the test only reads mixer samples.
# Use a private null sink: no desktop sound, global daemon, or system configuration.
audio_socket=""
audio_pid=""
cleanup_audio() {
	if [[ -n "$audio_pid" ]]; then
		kill "$audio_pid" 2>/dev/null || true
		wait "$audio_pid" 2>/dev/null || true
		rm -f -- "$audio_socket"
	fi
}
trap cleanup_audio EXIT
if command -v pulseaudio >/dev/null; then
	audio_socket="$output_dir/audio-pulse-$$.sock"
	DBUS_SESSION_BUS_ADDRESS="unix:path=$audio_socket.no-dbus" pulseaudio --daemonize=no --use-pid-file=no --exit-idle-time=-1 --log-target=stderr -n \
		--load="module-null-sink sink_name=fft_test" \
		--load="module-native-protocol-unix socket=$audio_socket auth-anonymous=1" \
		>"$output_dir/audio-pulse.log" 2>&1 &
	audio_pid=$!
	for _ in {1..50}; do
		[[ -S "$audio_socket" ]] && break
		if ! kill -0 "$audio_pid" 2>/dev/null; then
			cat "$output_dir/audio-pulse.log" >&2
			exit 1
		fi
		sleep 0.1
	done
	[[ -S "$audio_socket" ]] || {
		echo "Audio test sink did not start" >&2
		exit 1
	}
else
	echo "PulseAudio is unavailable: Firefox audio playback checks need a virtual output device." >&2
fi

# An isolated, anonymous Docker config avoids unrelated registry credential
# helpers (including unavailable Windows helpers on WSL). No global config changes.
docker --config "$cache_dir/docker-config" run --rm --init --ipc=host \
	--user "$(id -u):$(id -g)" \
	--mount "type=bind,src=$project_dir,dst=/work,readonly" \
	--mount "type=bind,src=$cache_dir/$lock_key/node_modules,dst=/work/node_modules" \
	--mount "type=bind,src=$cache_dir/dist,dst=/work/dist" \
	--mount "type=bind,src=$cache_dir/npm,dst=/browser-npm" \
	--mount "type=bind,src=$output_dir,dst=/work/tools/out/compatibility" \
	--workdir /work \
	--env npm_config_cache=/browser-npm \
	--env PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
	--env "PULSE_SERVER=${audio_socket:+unix:/work/tools/out/compatibility/${audio_socket##*/}}" \
	--env LIBGL_ALWAYS_SOFTWARE=1 \
	--env "E2E_WORKERS=${E2E_WORKERS:-1}" \
	--env "E2E_RENDERER=${E2E_RENDERER:-}" \
	--env "E2E_QUALITY=${E2E_QUALITY:-}" \
	--env "E2E_PORT=${E2E_PORT:-4173}" \
	--env E2E_OUTPUT_DIR=tools/out/compatibility/docker-results \
	--env E2E_REPORT_DIR=tools/out/compatibility/docker-report \
	"$image" bash -euc '
    if [[ ! -f node_modules/.browser-dependencies-ready ]]; then
      npm ci --no-audit --no-fund
      touch node_modules/.browser-dependencies-ready
    fi
    if [[ "${1:-}" == --probe ]]; then
      shift
      npx vite build --logLevel warn
      exec xvfb-run -a node tools/browser-probe.mjs "$@"
    fi
    exec xvfb-run -a npx playwright test --headed "$@"
  ' browser-test "$@"
