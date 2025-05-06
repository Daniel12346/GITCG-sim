import { myBannerPathState } from "@/recoil/atoms";
import {
  useSetRecoilState,
} from "recoil";
import ImageUpload from "./ImageUpload";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
export default function EditBanner() {
  const setMyBannerPath = useSetRecoilState(myBannerPathState);
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <ImageUpload
            bucketName="banners"
            iconSrc="/edit_icon.svg"
            afterUpload={(path) => {
              setMyBannerPath(path);
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="bg-opacity-90 ">Edit Banner</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
