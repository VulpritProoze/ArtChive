import { useState, useEffect } from 'react';
import { collective } from '@lib/api';
import { useAuth } from '@context/auth-context';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'

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
  const navigate = useNavigate()

  const { isMemberOfACollective, fetchCollectiveMemberDetails } = useAuth()

  useEffect(() => {
    const fetchCollectives = async () => {
      try {
        const response = await collective.get<ApiResponse>('details/');

        // filter out a specific collective (to not display it)
        // This collective id is the public collective. NOT a collective.
        // Just an indicator that it is a public post (for post)
        const filteredCollectives = response.data.results.filter(
            item => item.collective_id !== "00000000-0000-0000-0000-000000000001"
        )

        setCollectives(filteredCollectives);
        setLoading(false);
      } catch (err) {
        toast.error('Failed to fetch collectives');
        setLoading(false);
        console.error('Error fetching collectives:', err);
      }
    };

    fetchCollectives();
  }, []);

  const handleJoinCollective = async (collectiveId: string) => {
    const userConfirmed = window.confirm('Are you sure you want to join this collective?')
    if (userConfirmed) {
      try {
        const response = await collective.post('join/',
          { 'collective_id': collectiveId },
          { withCredentials: true }
        )

        await fetchCollectiveMemberDetails()

        let joined = response.data['joined']
        if (joined) toast.success('Successfully joined this collective!')
        else toast.info('You have already joined this collective')
        setLoading(true)
      } catch(err) {
        toast.error('Error joining this collective')
        setLoading(false)
        console.error('Error joining collective: ', err)
      }
    }
  }

  const handleCollectiveClick = (collectiveId: string) => {
    navigate(`/collective/${collectiveId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
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
            <div 
              key={collective.collective_id} 
              className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{collective.title}</h2>
                <p>{collective.collective_id}</p>
                <p>{collective.description}</p>
                
                {isMemberOfACollective(collective.collective_id) ?
                  <div className='hover:cursor-not-allowed'>
                    <button className='btn btn-primary w-full' disabled>Already joined</button>
                  </div> :
                  <button className='btn btn-primary' onClick={() => handleJoinCollective(collective.collective_id)}>Join Collective</button>
                }
                
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

                <div className='flex flex-row-reverse'>
                  <button className='btn btn-primary' onClick={() => handleCollectiveClick(collective.collective_id)}>Visit Collective</button>
                </div>
                
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