import CoreAudio
import Foundation

func readDefaultOutputDevice() -> AudioDeviceID? {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var device = AudioDeviceID(0)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    let status = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &address,
        0,
        nil,
        &size,
        &device
    )
    return status == noErr && device != 0 ? device : nil
}

func readDeviceName(_ device: AudioDeviceID) -> String? {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioObjectPropertyName,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var value: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    let status = AudioObjectGetPropertyData(
        device,
        &address,
        0,
        nil,
        &size,
        &value
    )
    guard status == noErr, let value else {
        return nil
    }
    return value.takeUnretainedValue() as String
}

guard
    let device = readDefaultOutputDevice(),
    let name = readDeviceName(device)
else {
    fputs("NO_OUTPUT\n", stderr)
    exit(2)
}

if name.localizedCaseInsensitiveContains("airpods") {
    print("AIRPODS")
    exit(0)
}

fputs("OTHER_OUTPUT\n", stderr)
exit(3)
