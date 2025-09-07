import { useState, useEffect } from 'react';
import { collective } from '@lib/api';

interface Channel {
  channel_id: string;
  title: string;
}

interface Collective {
  collective_id: string;
  channels: Channel[];
  title: string;
  description: string;
  status: string;
  artist_types: string[];
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Collective[];
}

export default function Index() {
  const [collectives, setCollectives] = useState<Collective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollectives = async () => {
      try {
        const response = await collective.get<ApiResponse>('details/');

        // filter out a specific collective (to not display it)
        const filteredCollectives = response.data.results.filter(
            item => item.collective_id !== "00000000-0000-0000-0000-000000000001"
        )

        setCollectives(filteredCollectives);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch collectives');
        setLoading(false);
        console.error('Error fetching collectives:', err);
      }
    };

    fetchCollectives();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error max-w-2xl mx-auto my-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center my-8">Collectives</h1>
      
      {collectives.length === 0 ? (
        <div className="text-center my-16">
          <p className="text-lg">No collectives found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collectives.map((collective) => (
            <div key={collective.collective_id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{collective.title}</h2>
                <p>{collective.collective_id}</p>
                <p>{collective.description}</p>
                
                <div className="my-2">
                  <span className={`badge ${collective.status === 'public' ? 'badge-success' : 'badge-warning'}`}>
                    {collective.status}
                  </span>
                </div>
                
                {collective.artist_types.length > 0 && (
                  <div className="my-2">
                    <div className="text-sm font-semibold mb-1">Artist Types:</div>
                    <div className="flex flex-wrap gap-1">
                      {collective.artist_types.map((type, index) => (
                        <span key={index} className="badge badge-outline">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {collective.channels.length > 0 && (
                  <div className="my-2">
                    <div className="text-sm font-semibold mb-1">Channels:</div>
                    <div className="flex flex-wrap gap-1">
                      {collective.channels.map((channel) => (
                        <span key={channel.channel_id} className="badge badge-info h-12">
                          {channel.title}, {channel.channel_id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Created: {new Date(collective.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}