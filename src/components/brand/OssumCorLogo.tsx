import React from "react"
import { cn } from "@/lib/utils"

interface OssumCorLogoProps {
  className?: string
  size?: number | string
  showText?: boolean
  textClassName?: string
}

export function OssumCorLogo({
  className = "size-10",
  size,
  showText = false,
  textClassName,
}: OssumCorLogoProps) {
  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1254 1254"
      className={cn("shrink-0", className)}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      aria-label="OSSUM COR Logo"
    >
      <title>OSSUM COR</title>
      <path
        id="s_body"
        fill="#14D8E6"
        d="M 565 245 L 527 245 L 526 246 L 506 247 L 505 248 L 499 248 L 455 258 L 424 269 L 390 285 L 365 300 L 341 317 L 321 334 L 301 354 L 280 380 L 264 405 L 252 429 L 242 455 L 242 459 L 236 482 L 235 496 L 234 497 L 234 527 L 235 528 L 236 543 L 238 553 L 246 576 L 255 593 L 264 606 L 282 625 L 295 635 L 309 644 L 329 654 L 347 661 L 350 661 L 371 668 L 396 673 L 410 674 L 411 675 L 419 675 L 429 677 L 443 677 L 444 678 L 459 678 L 460 679 L 480 681 L 512 690 L 524 696 L 540 707 L 558 728 L 565 743 L 569 760 L 568 788 L 564 803 L 558 817 L 546 834 L 527 851 L 507 861 L 488 866 L 469 867 L 468 866 L 458 866 L 441 862 L 412 849 L 388 832 L 369 813 L 357 799 L 337 770 L 320 741 L 316 742 L 282 759 L 264 770 L 257 773 L 235 788 L 245 811 L 258 836 L 267 851 L 286 878 L 304 899 L 322 917 L 354 943 L 388 964 L 431 983 L 468 994 L 488 998 L 500 999 L 501 1000 L 522 1001 L 523 1002 L 529 1002 L 624 913 L 644 890 L 662 862 L 670 845 L 675 831 L 680 812 L 680 807 L 682 800 L 682 790 L 683 789 L 683 762 L 682 761 L 681 746 L 672 713 L 656 682 L 640 661 L 625 646 L 615 638 L 586 619 L 558 606 L 528 596 L 524 596 L 505 591 L 480 588 L 479 587 L 446 585 L 445 584 L 426 582 L 404 576 L 389 569 L 377 561 L 369 553 L 360 541 L 354 528 L 352 520 L 350 499 L 351 498 L 351 487 L 354 474 L 363 452 L 378 430 L 400 407 L 426 388 L 441 380 L 468 369 L 495 363 L 563 295 L 592 262 L 600 250 L 582 248 L 581 247 L 574 247 L 573 246 L 566 246 Z"
      />
      <path
        id="top_arc"
        fill="#0E45A8"
        d="M 519 390 L 537 380 L 565 369 L 599 361 L 605 361 L 606 360 L 626 359 L 627 358 L 662 358 L 663 359 L 688 361 L 694 363 L 709 365 L 728 370 L 755 380 L 772 388 L 800 405 L 832 431 L 854 454 L 869 473 L 961 404 L 943 380 L 904 341 L 865 311 L 834 293 L 804 279 L 764 265 L 718 255 L 697 253 L 696 252 L 687 252 L 686 251 L 671 251 L 670 250 L 660 250 L 658 251 Z"
      />
      <path
        id="right_arc"
        fill="#2CDED0"
        d="M 976 427 L 914 475 L 894 489 L 885 497 L 903 532 L 915 568 L 920 593 L 921 607 L 922 608 L 923 639 L 922 640 L 922 656 L 921 657 L 920 671 L 915 696 L 910 710 L 910 713 L 900 739 L 891 757 L 881 773 L 881 775 L 966 841 L 977 848 L 998 815 L 1011 789 L 1027 747 L 1034 721 L 1040 689 L 1040 682 L 1041 681 L 1042 658 L 1043 657 L 1043 617 L 1042 616 L 1042 605 L 1041 604 L 1041 595 L 1040 594 L 1038 573 L 1030 538 L 1023 515 L 1012 487 L 995 453 L 980 430 Z"
      />
      <path
        id="bottom_arc"
        fill="#225BC0"
        d="M 960 867 L 869 797 L 866 796 L 852 813 L 829 835 L 811 849 L 784 866 L 766 875 L 733 887 L 708 893 L 680 896 L 599 974 L 571 1003 L 592 1006 L 593 1007 L 619 1009 L 620 1010 L 677 1010 L 678 1009 L 706 1007 L 707 1006 L 736 1002 L 745 999 L 765 995 L 796 985 L 835 968 L 837 966 L 859 955 L 885 938 L 920 910 L 950 880 Z"
      />
    </svg>
  )

  if (!showText) {
    return svg
  }

  return (
    <div className="flex items-center gap-3">
      {svg}
      <div className="flex flex-col text-left">
        <span className={cn("text-lg font-bold tracking-tight text-foreground", textClassName)}>
          OSSUM <span className="text-sky-500 font-extrabold">COR</span>
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          ERP Quirúrgico
        </span>
      </div>
    </div>
  )
}
