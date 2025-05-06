import { myAvatarPathState } from "@/recoil/atoms";
import { useSetRecoilState } from "recoil";
import ImageUpload from "./ImageUpload";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
export default function EditAvatar() {
  const setMyAvatarPath = useSetRecoilState(myAvatarPathState);
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <ImageUpload
            bucketName="avatars"
            iconSrc="/edit_icon.svg"
            afterUpload={async (path) => {
              path && setMyAvatarPath(path);
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="bg-opacity-90">Edit Avatar</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
