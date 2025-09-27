import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

const StudyRedirect: React.FC = () => {
  const { studyUid } = useParams<{ studyUid: string }>();
  
  // Redirect from /study/:studyUid to /studies/:studyUid
  return <Navigate to={`/studies/${studyUid}`} replace />;
};

export default StudyRedirect;