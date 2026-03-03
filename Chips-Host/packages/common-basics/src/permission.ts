export class PermissionGuard {
  public check(required: string[], granted: string[] | undefined): boolean {
    if (required.length === 0) {
      return true;
    }

    if (!granted || granted.length === 0) {
      return false;
    }

    const grantedSet = new Set(granted);
    return required.every((permission) => grantedSet.has(permission));
  }
}
