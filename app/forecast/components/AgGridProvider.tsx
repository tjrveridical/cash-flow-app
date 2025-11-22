'use client';

import { useEffect } from 'react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

export default function AgGridProvider() {
  useEffect(() => {
    ModuleRegistry.registerModules([AllCommunityModule]);
  }, []);
  return null;
}
