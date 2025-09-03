// Helper function to fetch assets with proper headers
export const fetchAssetWithAuth = async (fileId: string): Promise<Blob> => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("No auth token found");
  }

  const response = await fetch(`https://complaint.top-wp.com/assets/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }

  return response.blob();
};
