import type React from 'react';
import { create } from 'zustand';
import { DrawerSize, DrawerSide } from '@lorrigo/ui/components';

export type DrawerType = 'clone-order' | 'edit-order';

export type DrawerProps = Record<string, unknown> & {
  size?: DrawerSize;
  side?: DrawerSide;
};

type DrawerComponent = React.ComponentType<any>;

// Drawer animation states
export type DrawerAnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

// Drawer store state interface
interface DrawerState {
  drawers: Array<{
    id: string;
    type: DrawerType;
    props: DrawerProps;
    animationState: DrawerAnimationState;
  }>;
  drawerComponents: Record<DrawerType, DrawerComponent>;
  registerDrawer: (type: DrawerType, component: DrawerComponent) => void;
  openDrawer: (type: DrawerType, props?: DrawerProps) => string;
  closeDrawer: (id: string) => void;
  closeAllDrawers: () => void;
  setDrawerAnimationState: (id: string, state: DrawerAnimationState) => void;
}

// Animation timing in ms
const ANIMATION_DURATION = 300;

// Create and export Zustand store
export const useDrawerStore = create<DrawerState>((set, get) => ({
  drawers: [],
  drawerComponents: {
    'clone-order': undefined as unknown as DrawerComponent,
    'edit-order': undefined as unknown as DrawerComponent,
  },
  registerDrawer: (type, component) =>
    set((state) => ({
      drawerComponents: { ...state.drawerComponents, [type]: component },
    })),
  openDrawer: (type, props = {}) => {
    const id = `${type}-${Date.now()}`;
    set((state) => ({
      drawers: [...state.drawers, { id, type, props, animationState: 'entering' }],
    }));

    // Set animation state to "entered" after animation completes
    setTimeout(() => {
      get().setDrawerAnimationState(id, 'entered');
    }, ANIMATION_DURATION);

    return id;
  },
  closeDrawer: (id) => {
    // First set animation state to "exiting"
    get().setDrawerAnimationState(id, 'exiting');

    // Then remove drawer after animation completes
    setTimeout(() => {
      set((state) => ({
        drawers: state.drawers.filter((drawer) => drawer.id !== id),
      }));
    }, ANIMATION_DURATION);
  },
  closeAllDrawers: () => {
    // Get all drawer IDs
    const drawerIds = get().drawers.map((drawer) => drawer.id);

    // Set all drawers to exiting state
    drawerIds.forEach((id) => get().setDrawerAnimationState(id, 'exiting'));

    // Remove all drawers after animation completes
    setTimeout(() => {
      set({ drawers: [] });
    }, ANIMATION_DURATION);
  },
  setDrawerAnimationState: (id, animationState) =>
    set((state) => ({
      drawers: state.drawers.map((drawer) =>
        drawer.id === id ? { ...drawer, animationState } : drawer
      ),
    })),
}));
