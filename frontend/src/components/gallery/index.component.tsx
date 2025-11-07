import { Link } from "react-router-dom";
import { MainLayout } from "../common/layout";

const GalleryIndex = () => {

  return (
    <MainLayout showRightSidebar={false}>
      <Link to="/gallery/me" className="btn btn-primary">Go to your galleries</Link>
    </MainLayout>
  );
};

export default GalleryIndex;
