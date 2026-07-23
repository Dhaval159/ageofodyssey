import { InputAction } from "../core/InputAction";
import { DEFAULT_KEYBOARD_BINDINGS } from "../constants/InputBindings";

/**
 * Predefined input contexts allow scenes to activate only relevant actions.
 * This keeps unrelated inputs from triggering in the wrong state.
 */
export class InputContext {
  public static readonly MENU: InputAction[] = [
    InputAction.MOVE_UP,
    InputAction.MOVE_DOWN,
    InputAction.CONFIRM,
    InputAction.BACK,
    InputAction.MENU,
  ];

  public static readonly GAMEPLAY: InputAction[] = [
    InputAction.MOVE_UP,
    InputAction.MOVE_DOWN,
    InputAction.MOVE_LEFT,
    InputAction.MOVE_RIGHT,
    InputAction.ATTACK,
    InputAction.HEAVY_ATTACK,
    InputAction.ROLL,
    InputAction.BLOCK,
    InputAction.INTERACT,
    InputAction.PAUSE,
  ];

  public static readonly DIALOGUE: InputAction[] = [
    InputAction.CONFIRM,
    InputAction.BACK,
    InputAction.MENU,
  ];

  public static readonly CUTSCENE: InputAction[] = [
    InputAction.CONFIRM,
    InputAction.BACK,
    InputAction.MENU,
    InputAction.PAUSE,
  ];

  public static readonly PAUSED: InputAction[] = [
    InputAction.CONFIRM,
    InputAction.BACK,
    InputAction.PAUSE,
    InputAction.MENU,
  ];

  public static createFilteredBindings(
    activeActions: InputAction[]
  ): typeof DEFAULT_KEYBOARD_BINDINGS {
    const allBindings = DEFAULT_KEYBOARD_BINDINGS;
    return allBindings.filter((b) => activeActions.includes(b.action));
  }
}
