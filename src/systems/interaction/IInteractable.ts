export interface IInteractable {
  getId(): string;
  getInteractionPrompt(): string;
  getPosition(): { x: number; y: number };
  getInteractionRange(): number;
  isInteractionEnabled(): boolean;
  interact(): void;
}
