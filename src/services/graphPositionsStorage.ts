export interface NodePosition {
  x: number;
  y: number;
}

const STORAGE_PREFIX = 'repoxray_graph_pos_';

export const graphPositionsStorage = {
  getStoredPositions(projectId: string): Record<string, NodePosition> | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, NodePosition>;
      }
      return null;
    } catch {
      return null;
    }
  },

  saveStoredPositions(projectId: string, positions: Record<string, NodePosition>): void {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(positions));
    } catch (e) {
      console.warn('Failed to save graph positions to localStorage', e);
    }
  },

  updateNodePosition(projectId: string, fileId: string, pos: NodePosition): void {
    try {
      const positions = this.getStoredPositions(projectId) || {};
      positions[fileId] = { x: Math.round(pos.x), y: Math.round(pos.y) };
      this.saveStoredPositions(projectId, positions);
    } catch (e) {
      console.warn('Failed to update node position', e);
    }
  },

  clearStoredPositions(projectId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
    } catch {
      // ignore
    }
  },
};
