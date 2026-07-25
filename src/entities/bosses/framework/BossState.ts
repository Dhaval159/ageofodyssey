export interface BossState<T = any> {
  id: string;
  owner: T;
  enter(): void;
  update(time: number, delta: number): void;
  exit(): void;
}
