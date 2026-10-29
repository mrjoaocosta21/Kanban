import { useEffect, useState } from 'react';

function AssigneeAvatar({ assignee }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [assignee.avatarUrl]);

  return (
    <span className="assignee-avatar" aria-hidden="true">
      {imageFailed ? (
        <span>{assignee.initials}</span>
      ) : (
        <img src={assignee.avatarUrl} alt="" onError={() => setImageFailed(true)} />
      )}
    </span>
  );
}

export default AssigneeAvatar;
