interface HardwareSigner {
  hardwareSign: (signData: any) => Promise<[Buffer, number]>;
}
export { HardwareSigner };
