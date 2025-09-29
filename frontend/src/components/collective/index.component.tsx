import { useEffect } from "react";
import { useAuth } from "@context/auth-context";
import { useNavigate } from "react-router-dom";
import { CommonHeader } from "@components/common";
import { useCollectiveContext } from "@context/collective-context";

export default function Index() {
  const navigate = useNavigate();

  const { isMemberOfACollective, fetchCollectiveMemberDetails, user } =
    useAuth();
  const { fetchCollectives, collectives, handleJoinCollectiveAsync } =
    useCollectiveContext();

  useEffect(() => {
    fetchCollectives();
  }, []);

  const handleJoinCollective = async (collectiveId: string) => {
    await handleJoinCollectiveAsync(collectiveId);
    await fetchCollectiveMemberDetails();
    navigate(`/collective/${collectiveId}`);
  };

  const handleCollectiveClick = (collectiveId: string) => {
    navigate(`/collective/${collectiveId}`);
  };

  return (
    <div className="container max-w-full w-full">
      <CommonHeader user={user} />

      <h1 className="text-3xl font-bold text-center my-8">Collectives</h1>

      <div className="mx-8 mt-4">
        {collectives.length === 0 ? (
          <div className="text-center my-16">
            <p className="text-lg">No collectives found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collectives.map((collective) => (
              <div
                key={collective.collective_id}
                className="card bg-base-100 shadow-xl"
              >
                <div className="card-body">
                  <h2 className="card-title">{collective.title}</h2>
                  <p>{collective.collective_id}</p>
                  <p>{collective.description}</p>

                  {isMemberOfACollective(collective.collective_id) ? (
                    <div className="hover:cursor-not-allowed">
                      <button className="btn btn-primary w-full" disabled>
                        Already joined
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        handleJoinCollective(collective.collective_id)
                      }
                    >
                      Join Collective
                    </button>
                  )}

                  {collective.artist_types.length > 0 && (
                    <div className="my-2">
                      <div className="text-sm font-semibold mb-1">
                        Artist Types:
                      </div>
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
                      <div className="text-sm font-semibold mb-1">
                        Channels:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {collective.channels.map((channel) => (
                          <span
                            key={channel.channel_id}
                            className="badge badge-info h-12"
                          >
                            {channel.title}, {channel.channel_id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-row-reverse">
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        handleCollectiveClick(collective.collective_id)
                      }
                    >
                      Visit Collective
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Created:{" "}
                    {new Date(collective.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
